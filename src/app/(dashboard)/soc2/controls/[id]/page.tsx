type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="flex w-full flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">SOC 2 Control</h1>
      <p className="text-sm text-muted-foreground">ID: {id}</p>
    </main>
  );
}

