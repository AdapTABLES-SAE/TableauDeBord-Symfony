<?php

namespace App\Twig;

use App\Repository\EnseignantRepository;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\Extension\AbstractExtension;
use Twig\Extension\GlobalsInterface;

class AppExtension extends AbstractExtension implements GlobalsInterface
{
    private RequestStack $requestStack;
    private EnseignantRepository $enseignantRepository;

    public function __construct(RequestStack $requestStack, EnseignantRepository $enseignantRepository)
    {
        $this->requestStack = $requestStack;
        $this->enseignantRepository = $enseignantRepository;
    }

    public function getGlobals(): array
    {
        $session = $this->requestStack->getSession();
        $teacherName = null;

        if ($session && $session->has('teacher_id')) {
            $teacherId = $session->get('teacher_id');
            $enseignant = $this->enseignantRepository->find($teacherId);

            if ($enseignant) {
                $teacherName = $enseignant->getName();
            }
        }

        return [
            'current_teacher_name' => $teacherName,
        ];
    }
}
