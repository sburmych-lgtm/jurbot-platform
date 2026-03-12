import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Create lawyer
    const lawyerPassword = await bcrypt.hash('lawyer123', 12);
    const lawyer = await prisma.user.upsert({
        where: { email: 'lawyer@jurbot.com' },
        update: {},
        create: {
            email: 'lawyer@jurbot.com',
            password: lawyerPassword,
            name: 'Олександр Петренко',
            role: 'LAWYER',
            phone: '+380501234567',
            city: 'Київ',
            lawyerProfile: {
                create: {
                    licenseNo: 'АД-2020-1234',
                    specialties: ['FAMILY', 'CIVIL', 'LABOR'],
                    bio: 'Адвокат з 10-річним досвідом у сімейному та цивільному праві.',
                },
            },
        },
    });
    // Create clients
    const clientPassword = await bcrypt.hash('client123', 12);
    const client1 = await prisma.user.upsert({
        where: { email: 'maria@example.com' },
        update: {},
        create: {
            email: 'maria@example.com',
            password: clientPassword,
            name: 'Марія Коваленко',
            role: 'CLIENT',
            phone: '+380671234567',
            city: 'Київ',
            clientProfile: {
                create: {
                    accessCode: '123456',
                    taxId: '1234567890',
                },
            },
        },
    });
    const client2 = await prisma.user.upsert({
        where: { email: 'ivan@example.com' },
        update: {},
        create: {
            email: 'ivan@example.com',
            password: clientPassword,
            name: 'Іван Бондаренко',
            role: 'CLIENT',
            phone: '+380931234567',
            city: 'Одеса',
            clientProfile: {
                create: {
                    accessCode: '654321',
                },
            },
        },
    });
    const client3 = await prisma.user.upsert({
        where: { email: 'olena@example.com' },
        update: {},
        create: {
            email: 'olena@example.com',
            password: clientPassword,
            name: 'Олена Шевченко',
            role: 'CLIENT',
            phone: '+380961234567',
            city: 'Львів',
            clientProfile: {
                create: {
                    accessCode: '111222',
                },
            },
        },
    });
    // Get profiles for relations
    const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId: lawyer.id } });
    const client1Profile = await prisma.clientProfile.findUnique({ where: { userId: client1.id } });
    const client2Profile = await prisma.clientProfile.findUnique({ where: { userId: client2.id } });
    if (lawyerProfile && client1Profile && client2Profile) {
        // Create sample cases
        const case1 = await prisma.case.create({
            data: {
                caseNumber: 'CS-2026-0001',
                title: 'Розлучення та розділ майна',
                category: 'FAMILY',
                status: 'PREPARATION',
                urgency: 'WEEK',
                description: 'Клієнтка подає на розлучення та розділ спільного майна.',
                lawyerId: lawyerProfile.id,
                clientId: client1Profile.id,
                nextAction: 'Підготувати позовну заяву',
                nextDate: new Date('2026-03-20'),
            },
        });
        await prisma.case.create({
            data: {
                caseNumber: 'CS-2026-0002',
                title: 'Трудовий спір про незаконне звільнення',
                category: 'LABOR',
                status: 'ANALYSIS',
                urgency: 'URGENT',
                description: 'Клієнта звільнено без попередження.',
                lawyerId: lawyerProfile.id,
                clientId: client2Profile.id,
                nextAction: 'Зібрати документи про звільнення',
                nextDate: new Date('2026-03-15'),
            },
        });
        // Add checklist items
        await prisma.checklistItem.createMany({
            data: [
                { caseId: case1.id, text: 'Зібрати документи на майно', done: true, order: 0 },
                { caseId: case1.id, text: 'Оцінка нерухомості', done: true, order: 1 },
                { caseId: case1.id, text: 'Підготувати позовну заяву', done: false, order: 2 },
                { caseId: case1.id, text: 'Подати заяву до суду', done: false, order: 3 },
            ],
        });
    }
    console.log('Seed complete!');
    console.log('Lawyer: lawyer@jurbot.com / lawyer123');
    console.log('Client 1: maria@example.com / client123 (code: 123456)');
    console.log('Client 2: ivan@example.com / client123 (code: 654321)');
    console.log('Client 3: olena@example.com / client123 (code: 111222)');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map