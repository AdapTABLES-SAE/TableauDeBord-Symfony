<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class PConstruction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $tables;

    #[ORM\Column(length: 255)]
    private string $resultLocation;

    #[ORM\Column(length: 255)]
    private string $leftOperand;

    #[ORM\Column(length: 255)]
    private string $intervalMin;

    #[ORM\Column(length: 255)]
    private string $intervalMax;

    #[ORM\OneToOne(inversedBy: "construction", targetEntity: PNiveau::class)]
    private ?PNiveau $pniveau = null;

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTables(): string
    {
        return $this->tables;
    }

    public function setTables(string $tables): self
    {
        $this->tables = $tables;
        return $this;
    }

    public function getResultLocation(): string
    {
        return $this->resultLocation;
    }

    public function setResultLocation(string $resultLocation): self
    {
        $this->resultLocation = $resultLocation;
        return $this;
    }

    public function getLeftOperand(): string
    {
        return $this->leftOperand;
    }

    public function setLeftOperand(string $leftOperand): self
    {
        $this->leftOperand = $leftOperand;
        return $this;
    }

    public function getIntervalMin(): string
    {
        return $this->intervalMin;
    }

    public function setIntervalMin(string $intervalMin): self
    {
        $this->intervalMin = $intervalMin;
        return $this;
    }

    public function getIntervalMax(): string
    {
        return $this->intervalMax;
    }

    public function setIntervalMax(string $intervalMax): self
    {
        $this->intervalMax = $intervalMax;
        return $this;
    }

    public function getPniveau(): ?PNiveau
    {
        return $this->pniveau;
    }

    public function setPniveau(?PNiveau $pniveau): self
    {
        $this->pniveau = $pniveau;
        return $this;
    }
}
