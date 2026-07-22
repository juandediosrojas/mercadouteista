import { useState } from "react";
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
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
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
          {/* fila superior: sello + etiqueta */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                border: "2px dashed #6D100A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(-8deg)",
              }}
            >
              <PersonAddAltOutlinedIcon sx={{ color: "#6D100A", fontSize: 22 }} />
            </Box>
            <Typography
              sx={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#575756",
                border: "1px dashed #b8b0a0",
                borderRadius: "4px",
                px: 0.9,
                py: 0.3,
                mt: 0.7,
              }}
            >
              N° NUEVO
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "#132F20", mb: 0.3 }}
          >
            Crear cuenta
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#575756",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              mb: 3,
            }}
          >
            Tu acceso a MercadoU
          </Typography>

          <Divider sx={{ borderStyle: "dashed", borderColor: "#b8b0a0", mb: 3 }} />

          <Stack spacing={2.5}>
            <TextField
              variant="standard"
              label="Nombre"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ color: "#6D100A", fontSize: 20 }} />
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
              label="Correo"
              value={email}
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
              variant="contained"
              onClick={handleRegister}
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
              Registrarme
            </Button>

            <Button
              onClick={() => navigate("/login")}
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
              Ya tengo cuenta
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}