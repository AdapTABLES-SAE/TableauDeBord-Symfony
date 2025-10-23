<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Classe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "bigint")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $idClasse;

    #[ORM\Column(length: 255)]
    private string $name;

    /** @var Collection<int, Eleve> */
    #[ORM\OneToMany(mappedBy: "classe", targetEntity: Eleve::class)]
    private Collection $eleves;

    #[ORM\ManyToOne(targetEntity: Enseignant::class, inversedBy: "classes")]
    private ?Enseignant $enseignant = null;

    public function __construct()
    {
        $this->eleves = new ArrayCollection();
    }

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getIdClasse(): string
    {
        return $this->idClasse;
    }

    public function setIdClasse(string $idClasse): self
    {
        $this->idClasse = $idClasse;
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getEleves(): iterable
    {
        return $this->eleves;
    }

    public function addEleve(Eleve $eleve): self
    {
        $this->eleves[] = $eleve;
        return $this;
    }

    public function removeEleve(Eleve $eleve): self
    {
        $this->eleves = array_filter($this->eleves, fn($e) => $e !== $eleve);
        return $this;
    }

    public function getEnseignant(): ?Enseignant
    {
        return $this->enseignant;
    }

    public function setEnseignant(?Enseignant $enseignant): self
    {
        $this->enseignant = $enseignant;
        return $this;
    }
}
