import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { UserRole, MembershipTier, ProductStatus, KycStatus } from '../types/enums';
import { encrypt, encryptNumber } from '../utils/encryption';
import { fuzzCoordinates, buildLocationLabel } from '../utils/location-privacy';
import { getDistrictCoords } from '../data/district-coords';

const DEMO_PRODUCTS = [
  { title: 'Andamio metálico 2m', category: 'construccion', price: 55, district: 'Los Olivos', ref: 'Plaza Norte' },
  { title: 'Mezcladora de concreto', category: 'construccion', price: 80, district: 'San Juan de Lurigancho', ref: 'Mercado Ñaña' },
  { title: 'Taladro percutor Bosch', category: 'herramientas', price: 35, district: 'San Miguel', ref: 'CC Plaza San Miguel' },
  { title: 'Escalera extensible 6m', category: 'herramientas', price: 28, district: 'Breña', ref: 'Av. Brasil' },
  { title: 'Carpa 6x6 con laterales', category: 'fiestas', price: 120, district: 'Santiago de Surco', ref: 'Vía Expresa' },
  { title: 'Sillas plegables x20', category: 'fiestas', price: 90, district: 'Comas', ref: 'Mega Plaza' },
  { title: 'Licuadora industrial', category: 'hogar', price: 25, district: 'Miraflores', ref: 'Parque Kennedy' },
  { title: 'Vaporera grande', category: 'hogar', price: 40, district: 'Surquillo', ref: 'Surquillo centro' },
  { title: 'Carpa camping 4 personas', category: 'deportes', price: 45, district: 'La Molina', ref: 'La Molina' },
  { title: 'Cooler 80L', category: 'deportes', price: 20, district: 'Chorrillos', ref: 'Costa Verde' },
  { title: 'Carretilla reforzada', category: 'carga', price: 18, district: 'Independencia', ref: 'Tomás Valle' },
  { title: 'Plataforma hidráulica', category: 'carga', price: 95, district: 'Ate', ref: 'Carretera Central' },
  { title: 'Rotomartillo 1500W', category: 'herramientas', price: 42, district: 'Los Olivos', ref: 'Óvalo Naranjal' },
  { title: 'Mesa buffet plegable', category: 'fiestas', price: 35, district: 'San Borja', ref: 'Av. Javier Prado' },
  { title: 'Equipo de sonido 500W', category: 'fiestas', price: 75, district: 'Villa El Salvador', ref: 'Pachacamac' },
];

export async function seedDemoIfEmpty() {
  const productRepo = AppDataSource.getRepository(Product);
  const count = await productRepo.count();
  if (count >= 5) return;

  const userRepo = AppDataSource.getRepository(User);
  let owner = await userRepo.findOne({ where: { email: 'dueno.demo@alquila.pe' } });
  if (!owner) {
    owner = userRepo.create({
      email: 'dueno.demo@alquila.pe',
      passwordHash: await bcrypt.hash('demo12345', 12),
      displayName: 'Carlos M.',
      role: UserRole.BOTH,
      membershipTier: MembershipTier.PREMIUM,
      kycVerified: true,
      kycStatus: KycStatus.APPROVED,
      kycVerifiedAt: new Date(),
      phoneVerified: true,
      kycProvider: 'MOCK',
      acceptedTermsAt: new Date(),
      requiresQuestionnaire: true,
    });
    await userRepo.save(owner);
  }

  let tenant = await userRepo.findOne({ where: { email: 'cliente.demo@alquila.pe' } });
  if (!tenant) {
    tenant = userRepo.create({
      email: 'cliente.demo@alquila.pe',
      passwordHash: await bcrypt.hash('demo12345', 12),
      displayName: 'María L.',
      role: UserRole.BOTH,
      kycVerified: true,
      kycStatus: KycStatus.APPROVED,
      kycVerifiedAt: new Date(),
      phoneVerified: true,
      acceptedTermsAt: new Date(),
    });
    await userRepo.save(tenant);
  }

  for (const item of DEMO_PRODUCTS) {
    const coords = getDistrictCoords(item.district);
    const fuzzed = fuzzCoordinates(coords.lat, coords.lng);
    const product = productRepo.create({
      title: item.title,
      description: `${item.title} en excelente estado. Ideal para uso inmediato en ${item.district}. Recoges en zona acordada por chat.`,
      category: item.category,
      pricePerDay: item.price.toFixed(2),
      district: item.district,
      locationLabel: buildLocationLabel(item.district, item.ref),
      publicLat: fuzzed.publicLat,
      publicLng: fuzzed.publicLng,
      exactAddressEncrypted: encrypt(`Zona ${item.district}`),
      exactLatEncrypted: encryptNumber(coords.lat),
      exactLngEncrypted: encryptNumber(coords.lng),
      ownerId: owner.id,
      status: ProductStatus.ACTIVE,
      availableToday: true,
    });
    await productRepo.save(product);
  }

  console.log(`[Seed] ${DEMO_PRODUCTS.length} productos demo cargados`);
  console.log('[Seed] Login demo: dueno.demo@alquila.pe / demo12345');
}
