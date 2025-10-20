<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use App\Constant\ApiEndpoints;

class ApiClient
{
    private HttpClientInterface $client;

    // Le client HTTP de Symfony est injecté automatiquement
    public function __construct(HttpClientInterface $client)
    {
        $this->client = $client;
    }

    public function getTeacher(string $identifier): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $identifier;

        $response = $this->client->request('GET', $url);

        // Debug
        dump($url, $response->getStatusCode(), $response->getContent(false));
        // die; // temporaire pour voir le résultat

        if ($response->getStatusCode() === 200) {
            return $response->toArray();
        }

        return null;
    }

    public function fetchTeacherData(string $teacherId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $teacherId;

        $response = $this->client->request('GET', $url);

        if ($response->getStatusCode() === 200) {
            return $response->toArray();
        }

        return null;
    }
}
