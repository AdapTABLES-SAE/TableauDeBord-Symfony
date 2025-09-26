<?php

namespace App\Entity;

use App\Repository\ClasseRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: ClasseRepository::class)]
class Classe
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    private string $nom;

    #[ORM\Column(length: 50, unique: true)]
    private string $identifiant;

    #[ORM\ManyToOne(targetEntity: Enseignant::class, inversedBy: 'classes')]
    #[ORM\JoinColumn(nullable: false)]
    private Enseignant $enseignant;

    #[ORM\OneToMany(mappedBy: 'classe', targetEntity: Eleve::class, cascade: ['persist', 'remove'])]
    private Collection $eleves;

    public function __construct()
    {
        $this->eleves = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $nom): self { $this->nom = $nom; return $this; }
    public function getIdentifiant(): string { return $this->identifiant; }
    public function setIdentifiant(string $identifiant): self { $this->identifiant = $identifiant; return $this; }
    public function getEnseignant(): Enseignant { return $this->enseignant; }
    public function setEnseignant(Enseignant $enseignant): self { $this->enseignant = $enseignant; return $this; }
    public function getEleves(): Collection { return $this->eleves; }
}
