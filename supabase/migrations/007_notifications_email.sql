-- KayAyiti — 007 : e-mails automatiques pour les demandes de visite
-- À exécuter après 006. Envoi par la base (pg_net) via l'API Resend.
-- Désactivé tant que la clé n'est pas enregistrée dans le coffre-fort (voir la fin du fichier).
-- Une erreur d'envoi ne bloque jamais une demande de visite.

create extension if not exists pg_net with schema extensions;

-- Échappe le texte saisi par les utilisateurs avant de l'insérer dans un e-mail HTML
create or replace function public.html_escape(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function public.app_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

revoke execute on function public.app_secret(text) from public, anon, authenticated;

-- Envoi d'un e-mail (asynchrone : pg_net met la requête en file d'attente)
create or replace function public.send_email(p_to text, p_subject text, p_html text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := public.app_secret('resend_api_key');
  v_from text := coalesce(public.app_secret('email_from'), 'KayAyiti <notifications@kayayiti.com>');
begin
  if v_key is null or p_to is null or p_to = '' then
    return; -- notifications désactivées ou destinataire inconnu
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html)
  );
exception when others then
  raise warning 'send_email: %', sqlerrm; -- jamais bloquant
end;
$$;

revoke execute on function public.send_email(text, text, text) from public, anon, authenticated;

-- Gabarit commun, aux couleurs du site
create or replace function public.email_layout(p_title text, p_body text, p_cta_label text, p_cta_path text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select format(
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141a26">'
    '<p style="font-size:20px;font-weight:800;margin:0 0 16px"><span style="color:#0c234d">Kay</span><span style="color:#c7a150">Ayiti</span></p>'
    '<h1 style="font-size:18px;color:#0c234d;margin:0 0 12px">%s</h1>%s'
    '<p style="margin:24px 0"><a href="%s%s" style="background:#0c234d;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">%s</a></p>'
    '<p style="font-size:12px;color:#5d6474">Vous recevez cet e-mail car vous utilisez KayAyiti.</p></div>',
    p_title, p_body,
    coalesce(public.app_secret('site_url'), 'http://localhost:3000'), p_cta_path, p_cta_label
  );
$$;

revoke execute on function public.email_layout(text, text, text, text) from public, anon, authenticated;

create or replace function public.visit_slot_label(p_slot text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_slot when 'matin' then 'le matin (8 h – 12 h)'
                     when 'midi' then 'à midi (12 h – 14 h)'
                     else 'l''après-midi (14 h – 17 h)' end;
$$;

-- E-mail de l'agent (adresse pro) sinon e-mail de connexion du propriétaire
create or replace function public.owner_email(p_owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.email from public.agents a where a.id = p_owner and a.active_until > now() and a.email is not null),
    (select u.email from auth.users u where u.id = p_owner)
  );
$$;

revoke execute on function public.owner_email(uuid) from public, anon, authenticated;

-- Nouvelle demande → l'agent / le propriétaire
create or replace function public.notify_visit_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  select title into v_title from public.properties where id = new.property_id;

  perform public.send_email(
    public.owner_email(new.owner_id),
    'Nouvelle demande de visite : ' || left(coalesce(v_title, 'votre annonce'), 80),
    public.email_layout(
      'Nouvelle demande de visite',
      format(
        '<p><strong>%s</strong> souhaite visiter « %s » le <strong>%s</strong>, %s.</p>'
        '<p>Téléphone : <strong>%s</strong></p>%s',
        public.html_escape(new.name),
        public.html_escape(v_title),
        to_char(new.preferred_date, 'DD/MM/YYYY'),
        public.visit_slot_label(new.preferred_time),
        public.html_escape(new.phone),
        case when new.message is not null
             then '<p style="background:#f2eee6;padding:12px;border-radius:8px">' || public.html_escape(new.message) || '</p>'
             else '' end
      ),
      'Répondre à la demande',
      '/rendez-vous'
    )
  );
  return new;
exception when others then
  raise warning 'notify_visit_created: %', sqlerrm;
  return new;
end;
$$;

-- Changement de statut → la personne concernée
create or replace function public.notify_visit_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_requester_email text;
  v_when text;
begin
  if new.status = old.status and new.scheduled_at is not distinct from old.scheduled_at then
    return new;
  end if;

  select title into v_title from public.properties where id = new.property_id;
  select email into v_requester_email from auth.users where id = new.requester_id;
  v_when := to_char(new.scheduled_at at time zone 'America/Port-au-Prince', 'DD/MM/YYYY à HH24"h"MI');

  if new.status = 'confirmee' then
    perform public.send_email(
      v_requester_email,
      'Visite confirmée : ' || left(coalesce(v_title, 'votre visite'), 80),
      public.email_layout(
        'Votre visite est confirmée',
        format('<p>Rendez-vous le <strong>%s</strong> pour « %s ».</p>%s',
          v_when, public.html_escape(v_title),
          case when new.owner_note is not null then '<p>Note : ' || public.html_escape(new.owner_note) || '</p>' else '' end),
        'Voir mes rendez-vous', '/rendez-vous'
      )
    );
  elsif new.status = 'refusee' then
    perform public.send_email(
      v_requester_email,
      'Visite non disponible : ' || left(coalesce(v_title, 'votre demande'), 80),
      public.email_layout(
        'Votre demande de visite n''a pas pu être acceptée',
        format('<p>La visite de « %s » n''est pas possible pour le moment. D''autres biens vous attendent sur KayAyiti.</p>',
          public.html_escape(v_title)),
        'Voir d''autres biens', '/'
      )
    );
  elsif new.status = 'annulee' and old.status in ('en_attente', 'confirmee') then
    if new.owner_note is null then
      -- Annulée par le visiteur → prévenir l'agent / le propriétaire
      perform public.send_email(
        public.owner_email(new.owner_id),
        'Visite annulée : ' || left(coalesce(v_title, 'votre annonce'), 80),
        public.email_layout(
          'Une visite a été annulée',
          format('<p><strong>%s</strong> a annulé sa demande de visite pour « %s ».</p>',
            public.html_escape(new.name), public.html_escape(v_title)),
          'Voir mes rendez-vous', '/rendez-vous'
        )
      );
    else
      -- Annulée par le système (bien vendu / loué, demande expirée) → prévenir le visiteur
      perform public.send_email(
        v_requester_email,
        'Visite annulée : ' || left(coalesce(v_title, 'votre demande'), 80),
        public.email_layout(
          'Votre demande de visite est annulée',
          format('<p>« %s » : %s</p>', public.html_escape(v_title), public.html_escape(new.owner_note)),
          'Voir d''autres biens', '/'
        )
      );
    end if;
  end if;

  return new;
exception when others then
  raise warning 'notify_visit_updated: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists visit_requests_notify_created on public.visit_requests;
create trigger visit_requests_notify_created
  after insert on public.visit_requests
  for each row execute function public.notify_visit_created();

drop trigger if exists visit_requests_notify_updated on public.visit_requests;
create trigger visit_requests_notify_updated
  after update on public.visit_requests
  for each row execute function public.notify_visit_updated();

revoke execute on function public.notify_visit_created() from public, anon, authenticated;
revoke execute on function public.notify_visit_updated() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- ACTIVER LES E-MAILS (une fois, quand tu as un compte Resend et un domaine vérifié) :
--
-- select vault.create_secret('re_xxxxxxxxxxxx', 'resend_api_key');
-- select vault.create_secret('KayAyiti <notifications@ton-domaine.com>', 'email_from');
-- select vault.create_secret('https://ton-domaine.com', 'site_url');
--
-- Pour changer une valeur :
-- select vault.update_secret((select id from vault.secrets where name = 'resend_api_key'), 're_nouvelle_cle');
-- ─────────────────────────────────────────────────────────────────────
