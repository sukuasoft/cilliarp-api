import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Verificar se já existe um admin
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN }
  });

  if (existingAdmin) {
    console.log('👤 Admin já existe:', existingAdmin.email);
    return;
  }

  // Hash da senha padrão
  const defaultPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  // Criar usuário admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cilliarp.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Cilliarp',
      role: Role.ADMIN,
      bio: 'Administrador do sistema Cilliarp Academy',
    }
  });

  console.log('✅ Admin criado com sucesso!');
  console.log('📧 Email:', admin.email);
  console.log('🔑 Senha:', defaultPassword);
  console.log('🆔 ID:', admin.id);

  // Criar alguns usuários estudantes de exemplo (opcional)
  const students = await prisma.user.createMany({
    data: [
      {
        email: 'estudante1@exemplo.com',
        password: await bcrypt.hash('123456', 12),
        firstName: 'João',
        lastName: 'Silva',
        role: Role.STUDENT,
        bio: 'Estudante interessado em desenvolvimento web',
      },
      {
        email: 'estudante2@exemplo.com',
        password: await bcrypt.hash('123456', 12),
        firstName: 'Maria',
        lastName: 'Santos',
        role: Role.STUDENT,
        bio: 'Estudante de design e desenvolvimento',
      },
      {
        email: 'estudante3@exemplo.com',
        password: await bcrypt.hash('123456', 12),
        firstName: 'Pedro',
        lastName: 'Oliveira',
        role: Role.STUDENT,
        bio: 'Estudante de programação',
      }
    ]
  });

  console.log(`👥 ${students.count} estudantes de exemplo criados`);

  // Criar um curso de exemplo
  const course = await prisma.course.create({
    data: {
      title: 'Introdução ao Desenvolvimento Web',
      description: 'Aprenda os fundamentos do desenvolvimento web com HTML, CSS e JavaScript.',
      price: 299.99,
      isPublished: true,
      instructor: `${admin.firstName} ${admin.lastName}`,
    }
  });

  console.log('📚 Curso de exemplo criado:', course.title);

  // Criar algumas lições para o curso
  const lessons = await prisma.lesson.createMany({
    data: [
      {
        title: 'Introdução ao HTML',
        content: 'Nesta lição você aprenderá os conceitos básicos do HTML.',
        duration: 15,
        order: 1,
        courseId: course.id,
      },
      {
        title: 'Estilização com CSS',
        content: 'Aprenda a estilizar suas páginas web com CSS.',
        duration: 20,
        order: 2,
        courseId: course.id,
      },
      {
        title: 'Interatividade com JavaScript',
        content: 'Adicione interatividade às suas páginas com JavaScript.',
        duration: 25,
        order: 3,
        courseId: course.id,
      }
    ]
  });

  console.log(`📖 ${lessons.count} lições criadas para o curso`);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('\n📋 CREDENCIAIS DO ADMINISTRADOR:');
  console.log('Email: admin@cilliarp.com');
  console.log('Senha: admin123');
  console.log('\n📋 CREDENCIAIS DOS ESTUDANTES:');
  console.log('Email: estudante1@exemplo.com | Senha: 123456');
  console.log('Email: estudante2@exemplo.com | Senha: 123456');
  console.log('Email: estudante3@exemplo.com | Senha: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
