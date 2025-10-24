<?php
namespace App\Service;

use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

class TeacherSyncService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function syncTeacher(array $data): Enseignant
    {
        $repo = $this->em->getRepository(Enseignant::class);
        $enseignant = $repo->findOneBy(['idProf' => $data['idProf'] ?? null]) ?? new Enseignant();

        $enseignant->setIdProf($data['idProf'] ?? '');
        $enseignant->setName($data['name'] ?? '');

        $this->em->persist($enseignant);
        $this->em->flush();

        return $enseignant;
    }
}
