import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import crypto from 'crypto';

// =================================================================
// 🏛️ ENGINE INITIALIZATION (50MB ZIRHI)
// =================================================================
const fastify = Fastify({ 
    logger: false,
    disableRequestLogging: true,
    bodyLimit: 52428800 // Tam 50MB Payload Sınırı
});

await fastify.register(multipart, {
    limits: { fileSize: 52428800 }
});

// --- 🌐 KURUMSAL HEADERS (AWS DÜZEYİ) ---
const REGIONS = ["eu-west-3-paris-az1", "eu-central-1-frankfurt-az2"];
fastify.addHook('onSend', async (request, reply) => {
    reply.removeHeader('X-Powered-By');
    reply.removeHeader('Server');
    reply.header('Server', 'XanaxWay-X4-Data-Matrix/1.0');
    reply.header('X-XW-Compute-Tier', 'Global-Mesh-Storage');
    reply.header('X-XW-Region', REGIONS[Math.floor(Math.random() * REGIONS.length)]);
    reply.header('X-XW-Request-Trace', `xw-tr-${crypto.randomBytes(6).toString('hex')}`);
});

// =================================================================
// 🩺 XANAXWAY UYANDIRMA VE HIZ TESTİ ROTASI
// =================================================================
fastify.get('/status', async (req, reply) => {
    return { status: "operational", service: "X4-Storage-Test-Node" };
});

// =================================================================
// ⚡ X4 SIFIR-GECİKME DOSYA UPLOAD TESTİ (VERİTABANISIZ)
// =================================================================
fastify.post('/v1/x4/upload', async (req, reply) => {
    const startTime = Date.now();
    
    // 1. Dosyayı al
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Empty stream" });

    // 2. Hafızada Buffer'a dönüştür
    const fileBuffer = await data.toBuffer();
    const sizeInMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    
    console.log(`📥 [X4-UPLOAD] Alınan Dosya: ${data.filename} (${sizeInMB} MB)`);

    // 3. Node.js 18+ Yerleşik FormData mimarisi ile postala
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, data.filename);

    const X4_CDN_URL = process.env.X4_CDN_URL; 

    try {
        // 4. Kök hızı: CDN (Hugging Face) Tüneline Salla
        const response = await fetch(X4_CDN_URL, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.HF_TOKEN}`, // Private koruması için
                "x-xanaxway-secret": process.env.XANAXWAY_NODE_SECRET // Senkron koruması için
            },
            body: formData
        });

        // 5. Gecikme Hesapla ve Döküm Çıkar
        const cdnResult = await response.json();
        const latency = Date.now() - startTime;
        
        reply.header('X-Injection-Time', `${latency}ms`);
        
        return {
            status: "success",
            original_file: data.filename,
            size_mb: sizeInMB,
            total_latency_ms: latency,
            cdn_data: cdnResult
        };

    } catch (err) {
        console.error("🔥 FATAL TUNNEL ERR:", err);
        return reply.status(500).send({ error: "Network_Injection_Failed", trace: err.message });
    }
});

// --- SERVER START ---
const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        console.log(`🚀 X4 Pure Compute Test Engine Screamin' on Port ${process.env.PORT || 3000}`);
    } catch (err) { 
        console.error(err);
        process.exit(1); 
    }
};
start();
