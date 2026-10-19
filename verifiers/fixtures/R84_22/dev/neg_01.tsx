import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const registerSchema = yup.object({
  username: yup.string().required().min(3),
  email: yup.string().email().required(),
  age: yup.number().positive().integer().required(),
});

type RegisterValues = yup.InferType<typeof registerSchema>;

export function RegisterForm({ onDone }: { onDone: (v: RegisterValues) => void }) {
  const { register, handleSubmit } = useForm<RegisterValues>({
    resolver: yupResolver(registerSchema),
  });
  return (
    <form onSubmit={handleSubmit(onDone)}>
      <input {...register("username")} />
      <input {...register("email")} />
      <input type="number" {...register("age")} />
      <button>Create account</button>
    </form>
  );
}
