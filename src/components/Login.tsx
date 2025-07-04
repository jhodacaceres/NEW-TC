import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff } from "lucide-react";
import Logo from "../assets/LOGO.png";

interface LoginProps {
  onLogin: (employee: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (data: any) => {
    setLoading(true);
    try {
      // Buscar empleado por nombre de usuario y contraseña
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("username", data.username)
        .eq("password", data.password)
        .eq("active", true)
        .single();

      if (error || !employee) {
        throw new Error("Credenciales incorrectas o usuario inactivo");
      }

      // Guardar información del empleado en localStorage para sesión
      localStorage.setItem(
        "currentEmployee",
        JSON.stringify({
          id: employee.id,
          username: employee.username,
          first_name: employee.first_name,
          last_name: employee.last_name,
          position: employee.position,
          store_id: employee.store_id,
        })
      );

      onLogin(employee);
    } catch (error: any) {
      console.error("Error logging in:", error);
      alert(
        "Error al iniciar sesión: " +
          (error.message || "Credenciales incorrectas")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#121a2f" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="justify-center flex">
            <img src={Logo} alt="Logo" className="w-auto h-40 object-cover" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Sistema de Gestión Empresarial
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(handleLogin)}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Nombre de Usuario
              </label>
              <input
                {...register("username", {
                  required: "El nombre de usuario es requerido",
                  minLength: {
                    value: 3,
                    message:
                      "El nombre de usuario debe tener al menos 3 caracteres",
                  },
                })}
                type="text"
                autoComplete="off"
                className="mt-1 appearance-none bg-[#1e293b] text-[#e2e8f0] border-[#475569] relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Ingrese su nombre de usuario"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.username.message as string}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  {...register("password", {
                    required: "La contraseña es requerida",
                    minLength: {
                      value: 6,
                      message: "La contraseña debe tener al menos 6 caracteres",
                    },
                  })}
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  className="appearance-none bg-[#1e293b] text-[#e2e8f0] border-[#475569] relative block w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Ingrese su contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-40 inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5 text-gray-200" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-200" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-blue-200">
              Contacte al administrador para obtener credenciales de acceso
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
