import Fastify from 'fastify';
import multipart from '@fastify/multipart';

const fastify = Fastify({ 
    bodyLimit: 104857600 // 100MB Limit!
});
fastify.register(multipart);

const HF_TOKEN = process.env.HF_TOKEN; 
const REPO = process.env.HF_REPO;    // Format: "kullanici/repo"

// ⚡ X4-CDN GHOST PROXY: Hugging Face Linklerini XanaxWay URL'ine Dönüştür
fastify.get('/x4/view/:file', async (req, reply) => {
    const filename = req.params.file;
    const hfUrl = `https://huggingface.co/datasets/${REPO}/resolve/main/${filename}`;

    try {
        const response = await fetch(hfUrl, {
            headers: { "Authorization": `Bearer ${HF_TOKEN}` }
        });

        if (!response.ok) return reply.status(404).send({ error: "Artifact_Missing" });

        // Hugging Face'den gelen videoyu/resmi ham olarak müşteriye boruluyoruz (Streaming)
        reply.header('Content-Type', response.headers.get('content-type'));
        reply.header('Cache-Control', 'public, max-age=31536000, immutable'); // Sınırsız önbellek
        
        return reply.send(response.body);

    } catch (e) {
        return reply.status(500).send({ error: "CDN_Proxy_Failure" });
    }
});

fastify.post('/v1/x4/hyper-upload', async (req, reply) => {
    const start = Date.now();
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No stream" });

    const fileBuffer = await data.toBuffer();
    const filename = `${Math.random().toString(36).substring(2, 7)}_${data.filename}`;

    try {
        /**
         * 🛡️ THE ATOMIC COMMIT HACK (New Version)
         * Hugging Face'in yeni 'commit' ucuna 'add' aksiyonu fırlatıyoruz.
         * Hız farkı yaşanmaması için içeriği Base64 olarak gömüyoruz.
         */
        const hfCommitUrl = `https://huggingface.co/api/datasets/${REPO}/commit/main`;

        const commitPayload = {
            summary: `XanaxWay Matrix Injection: ${filename}`,
            actions: [
                {
                    action: "add",
                    path: filename,
                    content: fileBuffer.toString('base64') // Dosyayı metne çevirip içine gömüyoruz
                }
            ]
        };

        const hfResponse = await fetch(hfCommitUrl, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(commitPayload)
        });

        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            return reply.status(hfResponse.status).send({
                error: "HF_V3_Refused",
                details: errorText
            });
        }

        const latency = Date.now() - start;
        const cdnUrl = `https://huggingface.co/datasets/${REPO}/resolve/main/${filename}`;

        return {
            status: "sealed",
            id: `xw-${Math.random().toString(36).substring(2, 9)}`,
            latency: `${latency}ms`,
            url: cdnUrl
        };

    } catch (e) {
        return reply.status(500).send({ error: "Matrix_Sync_Failure", msg: e.message });
    }
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, () => console.log("🔥 X4-V3 Hyper-Direct Active."));
