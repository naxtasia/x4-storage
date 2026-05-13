import Fastify from 'fastify';
import multipart from '@fastify/multipart';

const fastify = Fastify({ bodyLimit: 104857600 }); // 100MB Limit!
fastify.register(multipart);

const HF_TOKEN = process.env.HF_TOKEN;
const REPO = process.env.HF_REPO; // Örn: "XanaxWay-Org/Cloud-Vault" (Dataset reposu)

// ⚡ 800ms'DE DOSYA MÜHÜRLEME (GIT COMMIT BEKLEMEZ)
fastify.post('/v1/x4/hyper-upload', async (req, reply) => {
    const start = Date.now();
    const data = await req.file();
    const fileBuffer = await data.toBuffer();
    
    // Rastgele isim ile çakışmayı önle
    const filename = `${Math.random().toString(36).substring(2, 10)}_${data.filename}`;

    try {
        // HUGGING FACE DIRECT HUB API (Git sistemini bypass eden mermi!)
        const hfUploadUrl = `https://huggingface.co/api/datasets/${REPO}/upload/main/${filename}`;

        const response = await fetch(hfUploadUrl, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/octet-stream"
            },
            body: fileBuffer
        });

        if (!response.ok) throw new Error("HF Hub Refused Pulse");

        const latency = Date.now() - start;

        // 🛡️ XANAXWAY PRESTİJ: KENDİ BEDAVA CDN'İMİZ!
        // Hugging Face'in ana resolve sunucularını kullanıyoruz (Saniyede Gbit hızında)
        const cdnUrl = `https://huggingface.co/datasets/${REPO}/resolve/main/${filename}`;

        return {
            status: "sealed",
            latency: `${latency}ms`,
            url: cdnUrl,
            direct_s3_path: `xanaxway://x4/${filename}`
        };

    } catch (e) {
        return reply.status(500).send({ error: "Injection_Failed", msg: e.message });
    }
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
