import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { PAGE_SIZE, parseFilters, searchProperties } from "@/lib/queries";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

async function Search({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const { items, total } = await searchProperties(filters);
  return <SearchView filters={filters} items={items} total={total} pageSize={PAGE_SIZE} />;
}

function SearchSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="h-[61px] shrink-0 border-b border-line bg-white" />
      <div className="flex min-h-0 flex-1">
        <div className="grid flex-1 content-start gap-4 p-4 sm:grid-cols-2 lg:w-[min(56%,820px)] lg:flex-none">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-sand-100" />
          ))}
        </div>
        <div className="hidden flex-1 animate-pulse bg-sand-100 lg:block" />
      </div>
    </div>
  );
}
