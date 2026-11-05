# Balón de Oro ⚽🏆

Stats de los partidos con los amigos y ranking anual para el Balón de Oro.
React + TypeScript + Tailwind + Supabase.

## Puesta en marcha (≈15 min)

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratis).
2. **SQL Editor** → pega `supabase/migrations/20261101000000_init.sql` → **Run**.
3. **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:5173` (luego la de Vercel)
   - *Redirect URLs*: añade `http://localhost:5173` y tu dominio de Vercel.

### 2. App
```bash
cp .env.example .env      # pega URL y anon key (Project Settings → API)
npm install
npm run dev
```

### 3. Hacerte admin
1. Entra en la app con tu email (te llega el enlace mágico).
2. Verás "Tu email no está en la plantilla": normal, aún no eres admin.
3. En el SQL Editor:
   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'tu@email.com';

   insert into players (name, email, user_id)
   select 'Raul', email, id from auth.users where email = 'tu@email.com';
   ```
4. Recarga la app. Ya ves **Nuevo** y **Plantilla**.

### 4. Dar de alta al grupo
En **Plantilla** añade a cada uno con su email. Cuando entren con ese email
se vinculan solos (`claim_player`). Sin email = invitado (suma stats, no vota).

### 5. Deploy
Vercel → importa el repo → variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
Como usa rutas del navegador, añade `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

## Cómo funciona

| Pieza | Qué hace |
|---|---|
| `seasons` | Temporada + pesos de puntuación (editables por temporada) |
| `players` | Jugadores; `user_id` opcional para invitados |
| `matches` + `match_players` | Partido y alineación de ese día (equipo A/B, goles, asist., portero) |
| `mvp_votes` | Voto anónimo, solo quien jugó, cierra a las 48 h (UI en fase 2) |
| `season_standings` | Vista que calcula puntos al vuelo |
| `register_match()` | RPC: partido + alineaciones en una transacción |

**Puntos por defecto:** victoria 3 · empate 1 · gol 2 · asistencia 1 ·
portería a cero 2 · MVP 3. Para optar al premio hay que jugar ≥ 50 % de los
partidos. Cambiarlo:

```sql
update seasons set pts_goal = 3, min_attendance = 0.6 where year = 2026;
```

**Seguridad (RLS):** solo ven datos los jugadores dados de alta; solo admins
escriben partidos y jugadores; nadie ve quién votó a quién.

## Roadmap
- [x] **Fase 1** — login, plantilla, registrar partido, ranking, historial
- [ ] **Fase 2** — votación MVP (esquema ya listo), perfil de jugador
- [ ] **Fase 3** — PWA instalable, cartas FIFA, Pichichi/Zamora
- [ ] **Fase 4** — Wrapped anual para la gala

## Tipos generados
Cuando tengas el proyecto: `npx supabase login`, luego
`SUPABASE_PROJECT_ID=xxxx npm run types` y pasa `Database` a `createClient`.
