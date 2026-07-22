import { useState, type FormEvent } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined"
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../contexts/AuthContext";

export default function LoginView() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    if (event) {
      event.preventDefault();
    }

    try {
      setLoading(true);
      if (!email || !password) {
        Swal.fire({
          icon: "error",
          title: "Campos incompletos",
          text: "Por favor, complete todos los campos.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      await login(email, password);
      navigate("/");
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        Swal.fire({
          icon: "error",
          title: "Usuario no encontrado",
          text: "El correo electrónico ingresado no está registrado.",
        });
      } else if (error.code === "auth/wrong-password") {
        Swal.fire({
          icon: "error",
          title: "Contraseña incorrecta",
          text: "La contraseña ingresada es incorrecta.",
        });
      } else if (error.code === "auth/invalid-credential") {
        Swal.fire({
          icon: "error",
          title: "Credenciales inválidas",
          text: "Las credenciales proporcionadas no son válidas.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error al iniciar sesión con Google",
        text: error.message,
      });
    }
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: "linear-gradient(135deg, #34531F 0%, #132F20 100%)",
        backgroundImage:
          "radial-gradient(rgba(248,233,212,0.06) 1px, transparent 1px), linear-gradient(135deg, #34531F 0%, #132F20 100%)",
        backgroundSize: "16px 16px, cover",
      }}
    >
      <Card
        sx={{
          width: 380,
          bgcolor: "#F8E9D4",
          boxShadow: "0 20px 60px rgba(19,47,32,0.45)",
          borderRadius: 0,
          // borde perforado tipo boleto (arriba y abajo)
          WebkitMaskImage:
            "radial-gradient(circle 7px at 24px 0, transparent 7px, #000 7.5px), radial-gradient(circle 7px at 24px 100%, transparent 7px, #000 7.5px)",
          WebkitMaskSize: "48px 100%, 48px 100%",
          WebkitMaskRepeat: "repeat-x",
          WebkitMaskPosition: "top, bottom",
          maskImage:
            "radial-gradient(circle 7px at 24px 0, transparent 7px, #000 7.5px), radial-gradient(circle 7px at 24px 100%, transparent 7px, #000 7.5px)",
          maskSize: "48px 100%, 48px 100%",
          maskRepeat: "repeat-x",
          maskPosition: "top, bottom",
        }}
      >
        <CardContent sx={{ p: 4, pt: 5 }}>
          <form onSubmit={handleLogin}>
            {/* sello circular */}
            <Box
              sx={{
                width: 316,
                height: 180, // Reducimos la altura del contenedor para forzar el recorte
                mx: "auto",
                mb: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden", // Corta el espacio blanco que sobresale
                position: "relative",
              }}
            >
              <img
                src="https://www.uts.edu.co/sitio/wp-content/uploads/2026/03/LOGO-UTS.png"
                alt="Logo UTS"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain", // Evita que el logo se deforme
                  transform: "scale(1.6)", // Amplía el logo para eliminar los bordes vacíos
                  transformOrigin: "center" // Asegura que el recorte sea igual arriba y abajo
                }}
              />
            </Box>

            <Typography
              variant="h4"
              textAlign="center"
              sx={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "#132F20", mb: 0.3 }}
            >
              Mercado UTS
            </Typography>

            <Typography
              variant="body2"
              textAlign="center"
              sx={{
                color: "#575756",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                mb: 3,
              }}
            >
              Mercado entre estudiantes
            </Typography>

            <Divider sx={{ borderStyle: "dashed", borderColor: "#b8b0a0", mb: 3 }} />

            <Stack spacing={2.5}>
              <TextField
                variant="standard"
                label="Correo"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ color: "#6D100A", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiInput-underline:before": { borderBottomColor: "#b8b0a0" },
                  "& .MuiInput-underline:after": { borderBottomColor: "#6D100A" },
                }}
              />

              <TextField
                variant="standard"
                label="Contraseña"
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#6D100A", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiInput-underline:before": { borderBottomColor: "#b8b0a0" },
                  "& .MuiInput-underline:after": { borderBottomColor: "#6D100A" },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                sx={{
                  borderRadius: 2,
                  py: 1.4,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #34531F 0%, #132F20 100%)",
                  textTransform: "none",
                  "&:hover": { boxShadow: "0 10px 25px rgba(19,47,32,0.35)" },
                }}
              >
                Ingresar
              </Button>

              <Divider sx={{ borderStyle: "dashed", borderColor: "#b8b0a0", color: "#575756", fontSize: 11 }}>
                o
              </Divider>

              <Button
                type="button"
                variant="outlined"
                onClick={handleGoogle}
                fullWidth
                startIcon={<GoogleIcon />}
                sx={{
                  borderRadius: 2,
                  py: 1.3,
                  fontWeight: 600,
                  borderColor: "#575756",
                  color: "#132F20",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#eee0c9", borderColor: "#575756" },
                }}
              >
                Continuar con Google
              </Button>

              <Button
                type="button"
                onClick={() => navigate("/register")}
                fullWidth
                sx={{
                  borderRadius: 2,
                  py: 1,
                  fontWeight: 600,
                  color: "#34531F",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#eee0c9" },
                }}
              >
                Crear una cuenta
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}