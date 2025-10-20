<?php

namespace App\Service;

use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service responsable de la synchronisation des classes et élèves
 * depuis l’API AdapTABLES vers la base de données Doctrine.
 */
class ClassroomSyncService
{
    private EntityManagerInterface $em;
    private ApiClient $apiClient;

    /**
     * Injection du gestionnaire d'entités Doctrine (EntityManagerInterface)
     * et du service ApiClient pour interagir avec l’API externe.
     */
    public function __construct(EntityManagerInterface $em, ApiClient $apiClient)
    {
        $this->em = $em;
        $this->apiClient = $apiClient;
    }

    /**
     * Synchronise toutes les classes et élèves d’un enseignant à partir des données API
     *
     * - On récupère les classes dans le tableau $data['classes']
     * - Pour chaque classe :
     *     • on crée ou met à jour l’entité Classe
     *     • on appelle l’API pour récupérer les élèves correspondants
     *     • on crée ou met à jour chaque Élève
     *
     * @param Enseignant $enseignant  L’entité enseignant à lier
     * @param array $data             Les données de l’API (retour de fetchTeacherData)
     */
    public function syncClassesAndStudents(Enseignant $enseignant, array $data): void
    {

        // Repositories Doctrine pour rechercher des entités existantes
        $classeRepo = $this->em->getRepository(Classe::class);
        $eleveRepo = $this->em->getRepository(Eleve::class);

        // Parcourt toutes les classes du professeur
        foreach ($data['classes'] as $classData) {
            $classId = $classData['id'] ?? null;
            $className = $classData['name'] ?? '';

            if (!$classId) continue;

            // Recherche une classe existante ou crée une nouvelle
            $classe = $classeRepo->findOneBy(['idClasse' => $classId]) ?? new Classe();

            $classe->setIdClasse($classId);
            $classe->setName($className);
            $classe->setEnseignant($enseignant);
            $this->em->persist($classe);

            // Récupère les élèves de cette classe via l'API
            $studentsData = $this->apiClient->fetchStudentsByTeacherAndClass(
                $enseignant->getIdProf(),
                $classId
            );

            // Boucle sur chaque élève retourné
            foreach ($studentsData as $student) {
                $learnerId = $student['id'] ?? null;
                if (!$learnerId) continue;

                // Recherche ou création d’un élève
                $eleve = $eleveRepo->findOneBy(['learnerId' => $learnerId]) ?? new Eleve();

                $eleve->setLearnerId($learnerId);
                $eleve->setNomEleve($student['nom'] ?? '');
                $eleve->setPrenomEleve($student['prenom'] ?? '');
                $eleve->setClasse($classe);

                $this->em->persist($eleve);
            }
        }

        $this->em->flush();
    }
}
