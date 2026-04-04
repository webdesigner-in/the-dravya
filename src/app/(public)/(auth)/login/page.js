import { isPublicRegistrationAllowed } from "@/lib/publicRegistration";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return <LoginClient showRegisterLink={isPublicRegistrationAllowed()} />;
}
