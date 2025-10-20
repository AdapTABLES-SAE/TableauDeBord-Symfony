<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use App\Constant\ApiEndpoints;

/**
 * Service utilitaire pour interagir avec l'API AdapTABLES.
 * Chaque méthode correspond à un endpoint spécifique.
 */
class ApiClient
{
    private HttpClientInterface $client;

    /**
     * Le client HTTP de Symfony (HttpClientInterface) est injecté automatiquement
     * grâce à l'autowiring. Il permet de faire des requêtes HTTP (GET, POST, etc.)
     * sans avoir à gérer les connexions manuellement.
     */
    public function __construct(HttpClientInterface $client)
    {
        $this->client = $client;
    }

    /**
     * Récupère les informations d'un enseignant depuis l'API
     *
     * Endpoint : GET /data/teacher/{teacherID}
     *
     * @param string $teacherId Identifiant enseignant (ex : "sandrag")
     * @return array|null Les données JSON de l’enseignant ou null si échec
     */
    public function fetchTeacherData(string $teacherId): ?array
    {
        // Construit l’URL complète : /FrameworkAPI/data/teacher/{teacherId}
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $teacherId;

        // Envoi d'une requête GET vers l'API
        $response = $this->client->request('GET', $url);

        // Si l'API répond correctement (status 200 OK), on convertit la réponse JSON en tableau PHP
        if ($response->getStatusCode() === 200) {
            return $response->toArray();
        }

        // Sinon, on retourne null (ex: identifiant introuvable)
        return null;
    }

    /**
     * Récupère la liste des élèves d’une classe d’un enseignant
     *
     * Endpoint : GET /data/students/teacher/{teacherID}/classroom/{classID}
     *
     * @param string $teacherId ID de l’enseignant
     * @param string $classId   ID de la classe (ex : "default")
     * @return array Liste des élèves sous forme de tableau associatif
     */
    public function fetchStudentsByTeacherAndClass(string $teacherId, string $classId): array
    {
        // Construit l’URL complète de l’endpoint
        $url = ApiEndpoints::BASE_URL . 'data/students/teacher/' . $teacherId . '/classroom/' . $classId;

        // Requête HTTP GET
        $response = $this->client->request('GET', $url);

        // Si succès (200), on renvoie les données
        if ($response->getStatusCode() === 200) {
            return $response->toArray();
        }

        // Sinon, on retourne un tableau vide (pas d'élèves ou erreur API)
        return [];
    }


    public function fetchLearningPathByLearner(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . 'path/training/learner/' . $learnerId;
        $response = $this->client->request('GET', $url);

        if ($response->getStatusCode() === 200) {
            return $response->toArray();
        }

        return null;
    }
}
