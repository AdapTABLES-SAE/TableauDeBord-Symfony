<?php

namespace App\Service;

use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

class TeacherSyncService
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * Synchronise les données d'un enseignant depuis l'API vers la base locale
     */
    public function syncTeacher(array $data): Enseignant
    {
        $repo = $this->em->getRepository(Enseignant::class);

        // Vérifie si l'enseignant existe déjà
        $teacher = $repo->findOneBy(['idProf' => $data['idProf']]);

        if (!$teacher) {
            $teacher = new Enseignant();
            $this->em->persist($teacher);
        }

        // Mapping des champs API -> Entité
        $teacher->setIdProf($data['idProf']);
        $teacher->setName($data['name']);

        $this->em->flush();

        return $teacher;
    }
}
