<?php

namespace App\Service;

use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

class ClassroomSyncService
{
    private EntityManagerInterface $em;
    private ApiClient $api;

    public function __construct(EntityManagerInterface $em, ApiClient $api)
    {
        $this->em = $em;
        $this->api = $api;
    }

    /**
     * Synchronise les classes et élèves d’un enseignant à partir de l’API externe.
     *
     * Exemple API /data/teacher/{teacherID} :
     * {
     *   "idProf": "sandrag",
     *   "classes": [
     *     { "nbStudents": 8, "name": "DEFAULT", "id": "default" }
     *   ],
     *   "name": "Sandra Gravouille"
     * }
     */
    public function syncClassesAndStudents(Enseignant $enseignant, array $enseignantData): void
    {
        $classes = $enseignantData['classes'] ?? [];

        foreach ($classes as $classData) {
            $classId = (string) ($classData['id'] ?? 'default');
            $className = (string) ($classData['name'] ?? $classId);

            // Trouve ou crée la classe
            $classe = $this->em->getRepository(Classe::class)->findOneBy(['idClasse' => $classId]) ?? new Classe();
            $classe->setIdClasse($classId);
            $classe->setName($className);
            $classe->setEnseignant($enseignant);

            $this->em->persist($classe);

            // Récupère les élèves de cette classe via l’API
            $students = $this->api->fetchStudentsByTeacherAndClass($enseignant->getIdProf(), $classId);

            foreach ($students as $student) {
                // L'API renvoie "id", "nom", "prenom", "idClasse"
                $learnerId = $student['id'] ?? null;
                $lastName  = $student['nom'] ?? '';
                $firstName = $student['prenom'] ?? '';

                if (!$learnerId) {
                    dump("⚠️ Élève ignoré (pas d'ID) :", $student);
                    continue;
                }

                // Trouve ou crée l'élève
                $eleve = $this->em->getRepository(Eleve::class)
                    ->findOneBy(['learnerId' => $learnerId]) ?? new Eleve();

                $eleve->setLearnerId($learnerId);
                $eleve->setNomEleve($lastName);
                $eleve->setPrenomEleve($firstName);
                $eleve->setClasse($classe);

                $this->em->persist($eleve);
            }
        }

        $this->em->flush();
    }
}
