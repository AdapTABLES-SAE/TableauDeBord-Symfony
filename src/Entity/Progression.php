<?php

namespace App\Entity;

use App\Repository\ProgressionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProgressionRepository::class)]
class Progression
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Eleve::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Eleve $eleve;

    #[ORM\ManyToOne(targetEntity: Tache::class, inversedBy: 'progressions')]
    #[ORM\JoinColumn(nullable: false)]
    private Tache $tache;

    #[ORM\Column(type: 'integer')]
    private int $score;

    #[ORM\Column(type: 'integer')]
    private int $tempsReponse;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $date;

    public function __construct()
    {
        $this->date = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getEleve(): Eleve { return $this->eleve; }
    public function setEleve(Eleve $eleve): self { $this->eleve = $eleve; return $this; }
    public function getTache(): Tache { return $this->tache; }
    public function setTache(Tache $tache): self { $this->tache = $tache; return $this; }
    public function getScore(): int { return $this->score; }
    public function setScore(int $score): self { $this->score = $score; return $this; }
    public function getTempsReponse(): int { return $this->tempsReponse; }
    public function setTempsReponse(int $tempsReponse): self { $this->tempsReponse = $tempsReponse; return $this; }
    public function getDate(): \DateTimeInterface { return $this->date; }
}
