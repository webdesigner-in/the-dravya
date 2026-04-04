import { isPublicRegistrationAllowed } from "@/lib/publicRegistration";
import RegisterDisabled from "./RegisterDisabled";
import RegisterClient from "./RegisterClient";

export default function RegisterPage() {
  if (!isPublicRegistrationAllowed()) {
    return <RegisterDisabled />;
  }
  return <RegisterClient />;
}
