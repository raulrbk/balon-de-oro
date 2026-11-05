import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
}

// Cuando tengas el proyecto creado, ejecuta `npm run types` y pasa el
// tipo generado: createClient<Database>(url, anonKey)
export const supabase = createClient(url, anonKey)
