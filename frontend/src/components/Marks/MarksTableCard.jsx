import { FaClipboardCheck } from "react-icons/fa";

function MarksTableCard({ marks }) {

  return (

    <div className="marks-card">

      <h2 className="card-title">
        <FaClipboardCheck className="card-icon" />
        Evaluation Marks
      </h2>

      <table className="marks-table">

        <thead>
          <tr>
            <th>Evaluation</th>
            <th>Obtained</th>
            <th>Maximum</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>Project Proposal</td>
            <td>{marks?.proposalMarks ?? 0}</td>
            <td>20</td>
          </tr>

          <tr>
            <td>Weekly Progress</td>
            <td>{marks?.weeklyProgressMarks ?? 0}</td>
            <td>30</td>
          </tr>

          <tr>
            <td>Final Report</td>
            <td>{marks?.finalReportMarks ?? 0}</td>
            <td>10</td>
          </tr>

          <tr>
            <td>Presentation / Viva</td>
            <td>{marks?.presentationVivaMarks ?? 0}</td>
            <td>20</td>
          </tr>

          <tr>
            <td>Source Code Quality</td>
            <td>{marks?.sourceCodeMarks ?? 0}</td>
            <td>20</td>
          </tr>

        </tbody>

        <tfoot>

          <tr>
            <th>Total</th>
            <th>{marks?.totalMarks ?? 0}</th>
            <th>100</th>
          </tr>

        </tfoot>

      </table>

    </div>

  );
}

export default MarksTableCard;