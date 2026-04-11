export type JobName = string;

export async function enqueueJob(_name: JobName, _payload: unknown) {
  throw new Error("Not implemented");
}

