<?php

namespace App\Entity;

use App\Repository\EnseignantRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: EnseignantRepository::class)]
class Enseignant
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private string $identifiant;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $nom = null;

    #[ORM\OneToMany(mappedBy: 'enseignant', targetEntity: Classe::class, cascade: ['persist', 'remove'])]
    private Collection $classes;

    public function __construct()
    {
        $this->classes = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getIdentifiant(): string { return $this->identifiant; }
    public function setIdentifiant(string $identifiant): self { $this->identifiant = $identifiant; return $this; }
    public function getNom(): ?string { return $this->nom; }
    public function setNom(?string $nom): self { $this->nom = $nom; return $this; }

    public function getClasses(): Collection { return $this->classes; }
}
