import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginView() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
    >
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h4" textAlign="center" gutterBottom>
            MercadoU
          </Typography>

          <Typography variant="body2" textAlign="center" mb={3}>
            Iniciar sesión
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={loading}
            >
              Ingresar
            </Button>

            <Divider>o</Divider>

            <Button
              variant="outlined"
              onClick={handleGoogle}
            >
              Continuar con Google
            </Button>

            <Button
              onClick={() => navigate("/register")}
            >
              Crear una cuenta
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}