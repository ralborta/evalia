export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapDatabaseIfNeeded } = await import("./lib/bootstrap-db");
    await bootstrapDatabaseIfNeeded();
  }
}
