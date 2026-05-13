import Fastify from 'fastify';
import multipart from '@fastify/multipart';

const fastify = Fastify({ 
    bodyLimit: 104857600 // 100MB Kapasite
});
fastify.register(multipart);

const HF_TOKEN = process.env.HF_TOKEN; // "WRITE" yetkili olduğundan emin ol!
const REPO = process.env.HF_REPO;    // Format: "kullanici/repo"

fastify.post('/v1/x4/hyper-upload', async (req, reply) => {
    const start = Date.now();
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Empty stream" });

    const fileBuffer = await data.toBuffer();
    const filename = `${Math.random().toString(36).substring(2, 7)}_${data.filename}`;

    try {
        /**
         * 🛡️ TRICKY UPDATE: 
         * Bazı durumlarda HF 'upload' yerine 'content' ucu ister.
         * En stabil ve Git bypass eden ucumuza vuruyoruz.
         */
        const hfApiUrl = `https://huggingface.co/api/datasets/${REPO}/upload/main/${filename}`;

        const hfResponse = await fetch(hfApiUrl, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/octet-stream"
            },
            body: fileBuffer
        });

        // 🔍 EĞER REDDEDİLİRSEK DETAYI OKUYALIM
        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error("❌ [HF-DENIED]:", errorText);
            
            return reply.status(hfResponse.status).send({
                error: "HF_Hub_Refused_Pulse",
                status_code: hfResponse.status,
                error_details: errorText // Neden reddettiğini burada göreceksin!
            });
        }

        const latency = Date.now() - start;
        const cdnUrl = `https://huggingface.co/datasets/${REPO}/resolve/main/${filename}`;

        return {
            status: "sealed",
            latency: `${latency}ms`,
            url: cdnUrl,
            meta: { filename, size: fileBuffer.length }
        };

    } catch (e) {
        return reply.status(500).send({ error: "Critical_Matrix_Crash", msg: e.message });
    }
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
