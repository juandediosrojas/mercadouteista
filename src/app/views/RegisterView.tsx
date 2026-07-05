import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterView() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    try {
      await register(displayName, email, password);
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
          <Typography
            variant="h4"
            align="center"
            gutterBottom
          >
            Registro
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Nombre"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <TextField
              label="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              variant="contained"
              onClick={handleRegister}
            >
              Registrarme
            </Button>

            <Button
              onClick={() => navigate("/login")}
            >
              Ya tengo cuenta
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}