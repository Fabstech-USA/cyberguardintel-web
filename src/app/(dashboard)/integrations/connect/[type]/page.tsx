type PageProps = {
  params: Promise<{ type: string }>;
};

export default async function Page({ params }: PageProps) {
  const { type } = await params;

  return (
    <main className="flex w-full flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">Connect Integration</h1>
      <p className="text-sm text-muted-foreground">Type: {type}</p>
    </main>
  );
}

