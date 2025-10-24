<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Entrainement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $learningPathID;

    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $structureHash = null;

    /** @var Collection<int, Objectif> */
    #[ORM\OneToMany(mappedBy: "entrainement", targetEntity: Objectif::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $objectifs;

    public function __construct()
    {
        $this->objectifs = new ArrayCollection();
    }

    // ----------- GETTERS / SETTERS -----------

    public function getId(): ?int { return $this->id; }

    public function getLearningPathID(): string { return $this->learningPathID; }
    public function setLearningPathID(string $id): self { $this->learningPathID = $id; return $this; }

    public function getStructureHash(): ?string { return $this->structureHash; }
    public function setStructureHash(?string $hash): self { $this->structureHash = $hash; return $this; }

    /** @return Collection<int, Objectif> */
    public function getObjectifs(): Collection { return $this->objectifs; }

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
}
