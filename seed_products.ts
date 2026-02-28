import supabase from './src/utils/supabase';
import crypto from 'crypto';

const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const mockProducts = [
    {
        name: "Classic Diamond Solitaire Ring",
        description: "A timeless classic featuring a brilliant round-cut diamond set in an elegant 18k white gold band. Perfect for engagements or special anniversaries.",
        price: 154500,
        stock: 12,
        category: "Rings",
        sku: "RNG-SOL-001",
        images: ["https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800&auto=format&fit=crop"],
        tags: ["diamond", "engagement", "white gold", "classic"],
    },
    {
        name: "Vintage Emerald Halo Ring",
        description: "An exquisite vintage-inspired design featuring a lush green emerald center stone surrounded by a halo of conflict-free diamonds.",
        price: 89000,
        stock: 8,
        category: "Rings",
        sku: "RNG-EMR-002",
        images: ["https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=800&auto=format&fit=crop"],
        tags: ["emerald", "vintage", "halo", "gold"],
    },
    {
        name: "Pearl Drop Pendant Necklace",
        description: "A single, perfectly round South Sea pearl dropping elegantly from a delicate 14k rose gold chain. Simple, sophisticated beauty.",
        price: 45000,
        stock: 25,
        category: "Necklaces",
        sku: "NCK-PRL-001",
        images: ["https://images.unsplash.com/photo-1599643477874-ce41d0639912?q=80&w=800&auto=format&fit=crop"],
        tags: ["pearl", "pendant", "rose gold", "elegant"],
    },
    {
        name: "Sapphire Tennis Bracelet",
        description: "A breathtaking continuous stream of deep blue sapphires interspersed with sparkling diamonds, secured in platinum.",
        price: 210000,
        stock: 5,
        category: "Bracelets",
        sku: "BRC-SPH-001",
        images: ["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop"],
        tags: ["sapphire", "tennis bracelet", "platinum", "luxury"],
    },
    {
        name: "Gold Hoop Statement Earrings",
        description: "Bold 22k yellow gold hoop earrings featuring a unique hammered texture. Lightweight enough for daily wear yet striking enough for evening.",
        price: 68000,
        stock: 15,
        category: "Earrings",
        sku: "ERR-GHP-001",
        images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop"],
        tags: ["gold", "hoops", "statement", "everyday"],
    },
    {
        name: "Diamond Cluster Studs",
        description: "A cluster of meticulously perfectly matched diamonds creating the illusion of a single, much larger stone. Set in 18k white gold.",
        price: 115000,
        stock: 10,
        category: "Earrings",
        sku: "ERR-DCL-001",
        images: ["https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?q=80&w=800&auto=format&fit=crop"],
        tags: ["diamond", "studs", "white gold", "cluster"],
    }
];

async function main() {
    console.log('Starting to seed mock products into Supabase...');

    for (const product of mockProducts) {
        const slug = generateSlug(product.name) + '-' + crypto.randomBytes(3).toString('hex');

        try {
            // Check if SKU exists to avoid duplicates
            const { data: existing, error: fetchError } = await supabase
                .from('products')
                .select('id')
                .eq('sku', product.sku)
                .maybeSingle(); // Returns null if not found

            if (existing) {
                console.log(`Product already exists, skipping: ${product.name}`);
                continue;
            }

            const { error } = await supabase
                .from('products')
                .insert({
                    ...product,
                    slug,
                    is_active: true,
                });

            if (error) {
                console.error(`Supabase error creating ${product.name}:`, error.message);
            } else {
                console.log(`Created product: ${product.name}`);
            }
        } catch (error) {
            console.error(`Network or unexpected error creating product ${product.name}:`, error);
        }
    }

    console.log('Finished seeding mock products!');
}

main()
    .catch((e) => {
        console.error('Fatal error during seeding:', e);
        process.exit(1);
    });
