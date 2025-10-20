<?php

namespace App\Service;

use App\Entity\Enseignant;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service responsable de la synchronisation des données d’un enseignant
 * entre l’API AdapTABLES et la base de données locale (Doctrine).
 */
class TeacherSyncService
{
    /**
     * Gestionnaire d’entités Doctrine.
     * Il permet d’enregistrer, de mettre à jour et de supprimer
     * des objets Doctrine dans la base de données.
     */
    private EntityManagerInterface $em;

    /**
     * Le constructeur injecte automatiquement EntityManagerInterface
     * grâce à l’autowiring de Symfony (pas besoin de configurer manuellement).
     */
    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * Synchronise les données d’un enseignant depuis l’API vers la base locale
     *
     * - Vérifie si l’enseignant existe déjà dans la base (via son idProf)
     * - Si non, crée une nouvelle entité Enseignant
     * - Met à jour les propriétés (idProf, name)
     * - Persiste les changements dans la base via Doctrine
     *
     * @param array $data Données JSON reçues de l’API pour cet enseignant
     *                    Exemple :
     *                    {
     *                      "idProf": "sandrag",
     *                      "name": "Sandra Gravouille",
     *                      "classes": [...]
     *                    }
     *
     * @return Enseignant L’entité Doctrine mise à jour
     */
    public function syncTeacher(array $data): Enseignant
    {
        // Récupère le repository Doctrine pour la classe Enseignant
        $repo = $this->em->getRepository(Enseignant::class);

        // Recherche si un enseignant existe déjà avec le même identifiant API
        $teacher = $repo->findOneBy(['idProf' => $data['idProf']]);

        // Si aucun enseignant trouvé, on crée une nouvelle instance
        if (!$teacher) {
            $teacher = new Enseignant();
            $this->em->persist($teacher);
        }

        // Mapping des données de l’API vers les attributs de l’entité Doctrine
        $teacher->setIdProf($data['idProf']);
        $teacher->setName($data['name']);

        $this->em->flush();

        return $teacher;
    }
}
