export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(p => p);

      // ── GESTION DES PHOTOS VIA CLOUDINARY ──
      if (pathParts[0] === 'api' && pathParts[1] === 'storage' && pathParts[2]) {
        const fileName = pathParts[2];

        // Upload de l'image vers Cloudinary (POST/PUT)
        if (request.method === 'POST' || request.method === 'PUT') {
          const blob = await request.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(blob)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          
          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${base64}`);
          formData.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);
          formData.append('public_id', fileName);
          
          const cloudinaryResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
          });
          
          const cloudinaryData = await cloudinaryResponse.json();
          
          if (!cloudinaryResponse.ok) {
            throw new Error(cloudinaryData.error?.message || 'Erreur Cloudinary');
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            url: cloudinaryData.secure_url,
            publicId: cloudinaryData.public_id
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // ── GESTION DE LA BASE DE DONNÉES VIA CLOUDFLARE KV ──
      if (pathParts[0] === 'api' && pathParts[1] === 'db') {
        const kv = env.DB || env.VIGILO_DB || env.KV;
        if (!kv) {
          throw new Error("Erreur Serveur : L'espace KV n'est pas lié au Worker.");
        }

        if (request.method === 'GET') {
          let data = await kv.get('db');
          if (data === null) {
            // Return default empty DB if not exists
            const defaultDB = {
              chantier: null,
              config: { nom:'', fonction:'', entreprise:'', dateDebut:'' },
              incidents: [],
              inductions: [],
              jsas: [],
              toolboxes: [],
              capas: [],
              epis: [],
              personnel: [],
              activity: [],
              capaCounter: 1,
              rapportsJournaliers: [],
              rapportsMensuels: [],
              permis: [],
              permisCounter: 1,
              envDechets: [],
              envPollutions: [],
              envIncidents: [],
              envEies: [],
              envCounter: 1
            };
            return new Response(JSON.stringify(defaultDB), { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          }
          return new Response(data, { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        if (request.method === 'POST') {
          const bodyText = await request.text();
          if (!bodyText) throw new Error("Le corps de la requête est vide.");
          JSON.parse(bodyText);
          await kv.put('db', bodyText);
          return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Route non trouvée' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};