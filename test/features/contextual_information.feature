Feature: Contextual Information

  As browsing on http://localhost:8080/nuxeo

  Scenario: Check Context Information
    Given the extension is open
    Then I can see http://localhost:8080/nuxeo/ as the connected server
