import { AppProvider } from './store';
import { Shell } from './shell';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const all = paramValue(params.all);
  return (
    <AppProvider
      deepLink={{
        messageId: paramValue(params.m) || undefined,
        stationId: paramValue(params.station) || undefined,
        username: paramValue(params.u) || undefined,
        all: all === '1' || all === 'true',
      }}
    >
      <Shell />
    </AppProvider>
  );
}
