import prisma from './src/utils/prisma';
import bcrypt from 'bcrypt';

async function main() {
    const adminEmail = 'admin@bellariti.com';
    const adminPassword = 'adminpassword';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            isVerified: true,
        },
    });

    console.log('Admin user seeded:', admin);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
