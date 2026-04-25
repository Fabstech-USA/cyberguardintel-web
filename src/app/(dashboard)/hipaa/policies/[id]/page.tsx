type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex w-full flex-col gap-2">
      <h1 className="text-2xl font-semibold">Policy</h1>
      <p className="text-sm text-muted-foreground">ID: {id}</p>
    </div>
  );
}

