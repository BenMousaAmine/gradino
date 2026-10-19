import { parseArgs } from "node:util";
import { createAdminClient } from "./supabase-admin";

const usage = "Usage: pnpm user:create --email <email> --password <password> --name <display name> [--admin]";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      password: { type: "string" },
      name: { type: "string" },
      admin: { type: "boolean", default: false },
    },
  });

  if (!values.email || !values.password || !values.name) {
    console.error(usage);
    process.exit(1);
  }
  if (values.password.length < 8) {
    console.error("The password must be at least 8 characters long.");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: { display_name: values.name },
  });
  if (error) throw new Error(error.message);

  if (values.admin) {
    const update = await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    if (update.error) throw new Error(update.error.message);
  }

  console.log(`Created ${values.admin ? "admin" : "student"} ${values.name} <${values.email}> (${data.user.id}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
