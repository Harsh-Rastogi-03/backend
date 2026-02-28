const axios = require('axios');

const API_URL = 'http://localhost:8000/api';


const sampleProducts = [
  // ================= RINGS =================
  {
    name: "Slim Minimalist Band Ring",
    description: "Lightweight and simple fashion ring for everyday corporate wear.",
    price: 1199,
    stock: 80,
    category: "Rings",
    sku: "AR-RNG-001",
    images: ["https://images.pexels.com/photos/17834/pexels-photo-17834.jpeg"],
    tags: ["minimal", "office", "everyday"]
  },
  {
    name: "Textured Silver Band Ring",
    description: "Stylish textured ring that adds a touch of elegance to office outfits.",
    price: 1399,
    stock: 70,
    category: "Rings",
    sku: "AR-RNG-002",
    images: ["https://images.pexels.com/photos/2899839/pexels-photo-2899839.jpeg"],
    tags: ["textured", "formal"]
  },
  {
    name: "Linked Circle Fashion Ring",
    description: "Modern linked design ring perfect for structured shirt styling.",
    price: 1499,
    stock: 65,
    category: "Rings",
    sku: "AR-RNG-003",
    images: ["https://images.pexels.com/photos/2849742/pexels-photo-2849742.jpeg"],
    tags: ["modern", "statement"]
  },
  {
    name: "CZ Accent Elegant Ring",
    description: "Fine fashion ring with subtle cubic zirconia accent.",
    price: 1599,
    stock: 50,
    category: "Rings",
    sku: "AR-RNG-004",
    images: ["https://images.pexels.com/photos/1395306/pexels-photo-1395306.jpeg"],
    tags: ["cz", "subtle sparkle"]
  },
  {
    name: "Adjustable Minimal Ring",
    description: "Adjustable fashion ring designed for daily corporate outfits.",
    price: 1299,
    stock: 60,
    category: "Rings",
    sku: "AR-RNG-005",
    images: ["https://images.pexels.com/photos/3038299/pexels-photo-3038299.jpeg"],
    tags: ["adjustable", "office chic"]
  },
  // ================= NECKLACES =================
  {
    name: "Bar Pendant Minimal Necklace",
    description: "Elegant bar pendant necklace for subtle office style.",
    price: 1699,
    stock: 75,
    category: "Necklaces",
    sku: "AR-NCK-001",
    images: ["https://images.pexels.com/photos/5043048/pexels-photo-5043048.jpeg"],
    tags: ["bar pendant", "daily wear"]
  },
  {
    name: "Layered Chain Trend Necklace",
    description: "Fashionable layered chain perfect for modern professional looks.",
    price: 1899,
    stock: 70,
    category: "Necklaces",
    sku: "AR-NCK-002",
    images: ["https://images.pexels.com/photos/10200795/pexels-photo-10200795.jpeg"],
    tags: ["layered", "fashion"]
  },
  {
    name: "Minimal CZ Pendant Necklace",
    description: "Delicate necklace with a subtle cubic zirconia accent.",
    price: 1799,
    stock: 60,
    category: "Necklaces",
    sku: "AR-NCK-003",
    images: ["https://images.pexels.com/photos/2599270/pexels-photo-2599270.jpeg"],
    tags: ["cz", "light sparkle"]
  },
  {
    name: "Circle Hoop Pendant Necklace",
    description: "Minimal hoop pendant necklace that pairs with formal shirts.",
    price: 1699,
    stock: 55,
    category: "Necklaces",
    sku: "AR-NCK-004",
    images: ["https://images.pexels.com/photos/6431177/pexels-photo-6431177.jpeg"],
    tags: ["hoop pendant", "everyday"]
  },
  {
    name: "Delicate Link Necklace",
    description: "Elegant link chain necklace for refined professional styling.",
    price: 1599,
    stock: 50,
    category: "Necklaces",
    sku: "AR-NCK-005",
    images: ["https://images.pexels.com/photos/4595723/pexels-photo-4595723.jpeg"],
    tags: ["link", "formal"]
  },
  // ================= EARRINGS =================
  {
    name: "Hoop Stud Earrings",
    description: "Lightweight hoops designed for long office hours.",
    price: 1299,
    stock: 85,
    category: "Earrings",
    sku: "AR-ERR-001",
    images: ["https://images.pexels.com/photos/9463362/pexels-photo-9463362.jpeg"],
    tags: ["hoops", "office"]
  },
  {
    name: "Minimal Stud Earrings",
    description: "Simple stud earrings for daily corporate styling.",
    price: 999,
    stock: 100,
    category: "Earrings",
    sku: "AR-ERR-002",
    images: ["https://images.pexels.com/photos/29193422/pexels-photo-29193422.jpeg"],
    tags: ["studs", "minimal"]
  },
  {
    name: "CZ Accent Drop Earrings",
    description: "Delicate drop earrings with a hint of sparkle.",
    price: 1499,
    stock: 60,
    category: "Earrings",
    sku: "AR-ERR-003",
    images: ["https://images.pexels.com/photos/235985/pexels-photo-235985.jpeg"],
    tags: ["drop", "cz sparkle"]
  },
  {
    name: "Silver Minimal Hoops",
    description: "Understated silver hoops that pair well with formal outfits.",
    price: 1199,
    stock: 75,
    category: "Earrings",
    sku: "AR-ERR-004",
    images: ["https://images.pexels.com/photos/7882737/pexels-photo-7882737.jpeg"],
    tags: ["hoops", "formal"]
  },
  {
    name: "Linked Chain Earrings",
    description: "Contemporary chain earrings for modern corporate fashion.",
    price: 1399,
    stock: 50,
    category: "Earrings",
    sku: "AR-ERR-005",
    images: ["https://images.pexels.com/photos/3266700/pexels-photo-3266700.jpeg"],
    tags: ["chain", "modern"]
  },
  // ================= BRACELETS =================
  {
    name: "Minimal Chain Bracelet",
    description: "A lightweight adjustable chain bracelet for everyday elegance.",
    price: 1299,
    stock: 80,
    category: "Bracelets",
    sku: "AR-BRC-001",
    images: ["https://images.pexels.com/photos/3679490/pexels-photo-3679490.jpeg"],
    tags: ["chain", "corporate"]
  },
  {
    name: "Textured Bangle Bracelet",
    description: "Elegant textured bangle that pairs with blazers and formal wear.",
    price: 1499,
    stock: 60,
    category: "Bracelets",
    sku: "AR-BRC-002",
    images: ["https://images.pexels.com/photos/8887000/pexels-photo-8887000.jpeg"],
    tags: ["bangle", "formal"]
  },
  {
    name: "CZ Accent Tennis Bracelet",
    description: "Light tennis bracelet with fine cubic zirconia accents.",
    price: 1699,
    stock: 55,
    category: "Bracelets",
    sku: "AR-BRC-003",
    images: ["https://images.pexels.com/photos/2618794/pexels-photo-2618794.jpeg"],
    tags: ["cz", "sparkle"]
  },
  {
    name: "Delicate Link Bracelet",
    description: "Fine link bracelet ideal for soft professional styling.",
    price: 1399,
    stock: 65,
    category: "Bracelets",
    sku: "AR-BRC-004",
    images: ["https://images.pexels.com/photos/114108/pexels-photo-114108.jpeg"],
    tags: ["link", "daily wear"]
  },
  {
    name: "Silver Modern Bracelet",
    description: "Contemporary bracelet to complement modern office wear.",
    price: 1499,
    stock: 50,
    category: "Bracelets",
    sku: "AR-BRC-005",
    images: ["https://images.pexels.com/photos/10738361/pexels-photo-10738361.jpeg"],
    tags: ["modern", "corporate"]
  },
  // ================= EXTRA 5 =================
  {
    name: "Stackable Ring Set",
    description: "Elegant stackable rings ready to mix and match with daily outfits.",
    price: 1799,
    stock: 45,
    category: "Rings",
    sku: "AR-RNG-006",
    images: ["https://images.pexels.com/photos/29967978/pexels-photo-29967978.jpeg"],
    tags: ["stackable", "mix match"]
  },
  {
    name: "Minimal Charm Necklace",
    description: "Small charm necklace that adds subtle personality to formal wear.",
    price: 1599,
    stock: 60,
    category: "Necklaces",
    sku: "AR-NCK-006",
    images: ["https://images.pexels.com/photos/4889719/pexels-photo-4889719.jpeg"],
    tags: ["charm", "minimal"]
  },
  {
    name: "Modern Stud Set",
    description: "A set of contemporary stud earrings perfect for office use.",
    price: 1699,
    stock: 50,
    category: "Earrings",
    sku: "AR-ERR-006",
    images: ["https://images.pexels.com/photos/5370641/pexels-photo-5370641.jpeg"],
    tags: ["stud set", "modern"]
  },
  {
    name: "Linked Office Bracelet",
    description: "A sleek linked bracelet to elevate daily corporate outfits.",
    price: 1599,
    stock: 55,
    category: "Bracelets",
    sku: "AR-BRC-006",
    images: ["https://images.pexels.com/photos/12124638/pexels-photo-12124638.jpeg"],
    tags: ["linked", "formal"]
  },
  {
    name: "Elegant Minimal Anklet",
    description: "A delicate anklet suitable for subtle everyday styling.",
    price: 1299,
    stock: 50,
    category: "Bracelets",
    sku: "AR-ANK-001",
    images: ["https://images.pexels.com/photos/1076584/pexels-photo-1076584.jpeg"],
    tags: ["anklet", "minimal"]
  }
];
async function seedProducts() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🌱 SEEDING PRODUCTS TO DATABASE         ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Create admin user
        console.log('1️⃣  Creating admin user...');
        const adminEmail = `admin${Date.now()}@bellariti.com`;
        const adminPassword = 'admin123456';

        const adminRes = await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail,
            password: adminPassword,
            name: 'Admin User',
            role: 'ADMIN'
        });

        const adminToken = adminRes.data.accessToken;
        console.log('   ✅ Admin created:', adminEmail);
        console.log('   🔑 Token received\n');

        // Step 2: Seed products
        console.log('2️⃣  Seeding products...\n');
        const createdProducts = [];

        for (let i = 0; i < sampleProducts.length; i++) {
            const product = sampleProducts[i];
            try {
                const res = await axios.post(
                    `${API_URL}/products`,
                    product,
                    { headers: { Authorization: `Bearer ${adminToken}` } }
                );

                createdProducts.push(res.data);
                console.log(`   ✅ [${i + 1}/${sampleProducts.length}] ${product.name}`);
                console.log(`      SKU: ${product.sku} | Price: $${product.price} | Stock: ${product.stock}`);
            } catch (error) {
                console.log(`   ❌ [${i + 1}/${sampleProducts.length}] ${product.name}`);
                console.log(`      Error: ${error.response?.data?.error || error.message}`);
            }
        }

        // Step 3: Verify products
        console.log('\n3️⃣  Verifying products in database...');
        const verifyRes = await axios.get(`${API_URL}/products`);
        const totalProducts = verifyRes.data.data.length;

        console.log(`   ✅ Total products in database: ${totalProducts}`);
        console.log(`   📦 Successfully seeded: ${createdProducts.length}/${sampleProducts.length}`);

        // Summary
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║                    SUMMARY                       ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log(`  ✅ Admin User: ${adminEmail}`);
        console.log(`  📦 Products Created: ${createdProducts.length}`);
        console.log(`  💾 Total in Database: ${totalProducts}`);
        console.log('');

        if (createdProducts.length === sampleProducts.length) {
            console.log('  🎉 All products seeded successfully!');
        } else {
            console.log('  ⚠️  Some products failed to seed. Check errors above.');
        }

        console.log('\n  📝 Admin Credentials (save these!):');
        console.log(`     Email: ${adminEmail}`);
        console.log(`     Password: ${adminPassword}`);
        console.log('');

        return {
            adminEmail,
            adminPassword,
            adminToken,
            products: createdProducts
        };

    } catch (error) {
        console.error('\n❌ Seeding failed!');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

// Run seeding
seedProducts()
    .then(result => {
        console.log('✨ Seeding complete!\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err.message);
        process.exit(1);
    });
