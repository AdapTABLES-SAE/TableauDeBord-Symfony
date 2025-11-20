<?php

namespace App\Service;

use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

class TeacherDeletionService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ApiClient $api
    ) {}

    /**
     * Supprime un enseignant :
     * 1) Suppression via API distante
     * 2) Suppression cascade Doctrine (classes, élèves, parcours, tâches, etc.)
     */
    public function deleteTeacher(Enseignant $enseignant): bool
    {
        $idProf = $enseignant->getIdProf();

        // 1 — suppression API
        $ok = $this->api->deleteTeacher($idProf);

        if (!$ok) {
            return false;
        }

        // 2 — suppression base locale
        $this->em->remove($enseignant);
        $this->em->flush();

        return true;
    }
}
