import { CloudClient } from "chromadb";

const chromaClient = new CloudClient({
    apiKey: process.env.CHROMA_API_KEY,
    tenant: process.env.CHROMA_TENANT,
    database: 'Development'
});

export default chromaClient;