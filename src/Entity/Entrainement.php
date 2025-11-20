<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use App\Entity\Enseignant;

#[ORM\Entity]
class Entrainement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    private string $learningPathID;

    /** @var Collection<int, Objectif> */
    #[ORM\OneToMany(mappedBy: "entrainement", targetEntity: Objectif::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $objectifs;

    /** @var Collection<int, Eleve> */
    #[ORM\OneToMany(mappedBy: "entrainement", targetEntity: Eleve::class)]
    private Collection $eleves;

    #[ORM\ManyToOne(targetEntity: Enseignant::class)]
    private ?Enseignant $enseignant = null;

    public function __construct()
    {
        $this->objectifs = new ArrayCollection();
        $this->eleves = new ArrayCollection();
    }

    // ----------- GETTERS / SETTERS -----------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getLearningPathID(): string
    {
        return $this->learningPathID;
    }

    public function setLearningPathID(string $id): self
    {
        $this->learningPathID = $id;
        if($this)
        return $this;
    }

    /** @return Collection<int, Objectif> */
    public function getObjectifs(): Collection
    {
        return $this->objectifs;
    }

    public function addObjectif(Objectif $objectif): self
    {
        if (!$this->objectifs->contains($objectif)) {
            $this->objectifs->add($objectif);
            $objectif->setEntrainement($this);
        }
        return $this;
    }

    public function removeObjectif(Objectif $objectif): self
    {
        if ($this->objectifs->removeElement($objectif)) {
            if ($objectif->getEntrainement() === $this) {
                $objectif->setEntrainement(null);
            }
        }
        return $this;
    }

    /** @return Collection<int, Eleve> */
    public function getEleves(): Collection
    {
        return $this->eleves;
    }

    public function addEleve(Eleve $eleve): self
    {
        if (!$this->eleves->contains($eleve)) {
            $this->eleves->add($eleve);
            $eleve->setEntrainement($this);
        }
        return $this;
    }

    public function removeEleve(Eleve $eleve): self
    {
        if ($this->eleves->removeElement($eleve)) {
            if ($eleve->getEntrainement() === $this) {
                $eleve->setEntrainement(null);
            }
        }
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
