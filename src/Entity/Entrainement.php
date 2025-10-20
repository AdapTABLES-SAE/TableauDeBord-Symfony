<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Entrainement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $learningPathID;

    #[ORM\ManyToOne(targetEntity: Eleve::class, inversedBy: "entrainements")]
    private ?Eleve $eleve = null;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "entrainements")]
    private ?Objectif $objectif = null;

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLearningPathID(): string
    {
        return $this->learningPathID;
    }

    public function setLearningPathID(string $learningPathID): self
    {
        $this->learningPathID = $learningPathID;
        return $this;
    }

    public function getEleve(): ?Eleve
    {
        return $this->eleve;
    }

    public function setEleve(?Eleve $eleve): self
    {
        $this->eleve = $eleve;
        return $this;
    }

    public function getObjectif(): ?Objectif
    {
        return $this->objectif;
    }

    public function setObjectif(?Objectif $objectif): self
    {
        $this->objectif = $objectif;
        return $this;
    }
}
