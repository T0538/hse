export default {
  async fetch(request, env, ctx) {
    console.log('[Worker] Nouvelle requête reçue:', request.method, request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      console.log('[Worker] Requête OPTIONS, retour CORS');
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(p => p);
      console.log('[Worker] pathParts:', pathParts);

      // ── GESTION DES PHOTOS VIA CLOUDINARY ──
      if (
        (pathParts[0] === 'api' && pathParts[1] === 'storage' && pathParts[2]) ||
        (pathParts[0] === 'api' && pathParts[1] === 'upload' && pathParts[2] === 'photos')
      ) {
        console.log('[Worker] Requête pour Cloudinary');
        // On prend le dernier segment de chemin comme nom de fichier
        const fileName = pathParts[pathParts.length - 1];
        console.log('[Worker] Nom de fichier:', fileName);

        // Upload de l'image vers Cloudinary (POST/PUT)
        if (request.method === 'POST' || request.method === 'PUT') {
          console.log('[Worker] Début upload vers Cloudinary');
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
          console.log('[Worker] Réponse Cloudinary:', cloudinaryData);
          
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
      // Accepte à la fois /api/db et /api/db/QUELQUECHOSE (rétrocompatibilité)
      if (pathParts[0] === 'api' && pathParts[1] === 'db') {
        console.log('[Worker] Requête pour DB');
        const kv = env.DB || env.VIGILO_DB || env.KV;
        console.log('[Worker] KV disponible?', !!kv);
        if (!kv) {
          throw new Error("Erreur Serveur : L'espace KV n'est pas lié au Worker.");
        }

        if (request.method === 'GET') {
          console.log('[Worker] Requête GET DB');
          let data = await kv.get('db');
          console.log('[Worker] Données KV pour "db":', data);
          // Vérifie aussi la clé avec l'ID (pour l'ancienne version)
          if (data === null && pathParts[2]) {
            data = await kv.get(pathParts[2]);
            console.log('[Worker] Données KV pour "'+pathParts[2]+'":', data);
          }
          if (data === null) {
            console.log('[Worker] Aucune donnée, retour default DB');
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
          console.log('[Worker] Retourne données KV');
          return new Response(data, { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        if (request.method === 'POST') {
          console.log('[Worker] Requête POST DB');
          const bodyText = await request.text();
          console.log('[Worker] Corps reçu (premiers 200 caractères):', bodyText.substring(0,200));
          if (!bodyText) throw new Error("Le corps de la requête est vide.");
          JSON.parse(bodyText); // Vérifie que c'est du JSON valide
          console.log('[Worker] Début put dans KV');
          await kv.put('db', bodyText);
          console.log('[Worker] Put KV réussi');
          // Sauvegarde aussi dans la clé avec l'ID si elle existe (rétrocompatibilité)
          if (pathParts[2]) {
            console.log('[Worker] Sauvegarde aussi dans "'+pathParts[2]+'"');
            await kv.put(pathParts[2], bodyText);
          }
          return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      console.log('[Worker] Route non trouvée');
      return new Response(JSON.stringify({ error: 'Route non trouvée' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      console.error('[Worker] Erreur:', error);
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};