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

    public function createAdminTeacher(ApiClient $apiClient): Enseignant
    {
        $repo = $this->em->getRepository(Enseignant::class);

        // ------------------------------------------------------------------
        // 1. Check Doctrine
        // ------------------------------------------------------------------
        $enseignant = $repo->findOneBy(['idProf' => 'ADMIN']);

        // ------------------------------------------------------------------
        // 2. Check API
        // ------------------------------------------------------------------
        $apiTeacher = $apiClient->fetchTeacherData('ADMIN');

        // ------------------------------------------------------------------
        // 3. Create in API if missing
        // ------------------------------------------------------------------
        if ($apiTeacher === null) {
            $apiResult = $apiClient->createTeacher('ADMIN', 'ADMIN');

            if (!($apiResult['success'] ?? false)) {
                throw new \RuntimeException('Impossible de créer le professeur ADMIN dans l’API.');
            }
        }

        // ------------------------------------------------------------------
        // 4. Create in Doctrine if missing
        // ------------------------------------------------------------------
        if (!$enseignant) {
            $enseignant = new Enseignant();
            $enseignant->setIdProf('ADMIN');
            $enseignant->setName('ADMIN');

            $this->em->persist($enseignant);
            $this->em->flush();
        }

        return $enseignant;
    }

}
