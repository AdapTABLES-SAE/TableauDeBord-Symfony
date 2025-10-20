<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Eleve
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $learnerId;

    #[ORM\Column(length: 255)]
    private string $nomEleve;

    #[ORM\Column(length: 255)]
    private string $prenomEleve;

    #[ORM\ManyToOne(targetEntity: Classe::class, inversedBy: "eleves")]
    private ?Classe $classe = null;

    #[ORM\OneToMany(mappedBy: "eleve", targetEntity: Entrainement::class)]
    private iterable $entrainements;

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLearnerId(): string
    {
        return $this->learnerId;
    }

    public function setLearnerId(string $learnerId): self
    {
        $this->learnerId = $learnerId;
        return $this;
    }

    public function getNomEleve(): string
    {
        return $this->nomEleve;
    }

    public function setNomEleve(string $nomEleve): self
    {
        $this->nomEleve = $nomEleve;
        return $this;
    }

    public function getPrenomEleve(): string
    {
        return $this->prenomEleve;
    }

    public function setPrenomEleve(string $prenomEleve): self
    {
        $this->prenomEleve = $prenomEleve;
        return $this;
    }

    public function getClasse(): ?Classe
    {
        return $this->classe;
    }

    public function setClasse(?Classe $classe): self
    {
        $this->classe = $classe;
        return $this;
    }

    public function getEntrainements(): iterable
    {
        return $this->entrainements;
    }

    public function addEntrainement(Entrainement $entrainement): self
    {
        $this->entrainements[] = $entrainement;
        return $this;
    }

    public function removeEntrainement(Entrainement $entrainement): self
    {
        $this->entrainements = array_filter($this->entrainements, fn($e) => $e !== $entrainement);
        return $this;
    }
}
