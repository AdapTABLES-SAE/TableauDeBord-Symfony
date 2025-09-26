<?php

namespace App\Entity;

use App\Repository\EntrainementRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: EntrainementRepository::class)]
class Entrainement
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Eleve::class, inversedBy: 'entrainements')]
    #[ORM\JoinColumn(nullable: false)]
    private Eleve $eleve;

    #[ORM\Column(length: 255)]
    private string $objectif;

    #[ORM\Column(type: 'integer')]
    private int $niveau;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $progression = [];

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    #[ORM\OneToMany(mappedBy: 'entrainement', targetEntity: Tache::class, cascade: ['persist', 'remove'])]
    private Collection $taches;

    public function __construct()
    {
        $this->taches = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getEleve(): Eleve { return $this->eleve; }
    public function setEleve(Eleve $eleve): self { $this->eleve = $eleve; return $this; }
    public function getObjectif(): string { return $this->objectif; }
    public function setObjectif(string $objectif): self { $this->objectif = $objectif; return $this; }
    public function getNiveau(): int { return $this->niveau; }
    public function setNiveau(int $niveau): self { $this->niveau = $niveau; return $this; }
    public function getProgression(): ?array { return $this->progression; }
    public function setProgression(?array $progression): self { $this->progression = $progression; return $this; }
    public function getTaches(): Collection { return $this->taches; }
}
